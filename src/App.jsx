
import { useState } from "react";
import { ethers } from "ethers";
import "./App.css";
import logo from "./Images/academy.png";

// ==========================================
// TOKEN CONFIG
// ==========================================

const TOKENS = {
  ETH: {
    symbol: "ETH",
    address: null,
    decimals: 18,
    pool: null,
  },

  mUSDT: {
    symbol: "mUSDT",
    address: "0xb161A0AdA15055110F11303F41ec185953eA1cb2",
    decimals: 18,
    pool: "0x99196CB17B27d9Ff34e2f1Afc9eE42aff53E0c54",
  },

  mWBTC: {
    symbol: "mWBTC",
    address: "0xB65c3A1D6Cfad38d578495E10a9c62Dd556C0607",
    decimals: 8,
    pool: "0xb8CcA9225E1697c11EF5B5031f5884F62E8C078F",
  },

  mSOL: {
    symbol: "mSOL",
    address: "0x3Ff3b2F90E45A1DF8B63442B6CC7169E2E20e029",
    decimals: 9,
    pool: "0xeD5E93dB3BF0917409caf663610c0EEB25D1d233",
  },
};

const TOKEN_OPTIONS = Object.keys(TOKENS);

const MY_SWAP_ABI = [
  "function swapETHForUSDT() external payable",
  "function swapUSDTForETH(uint256 usdtAmount) external",
  "function getReserves() external view returns (uint256, uint256)",
  "function usdt() external view returns (address)",
];

const TOKEN_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
];

const FEE = 30n;
const DENOMINATOR = 10000n;

function formatAmount(value, decimals = 2) {
  return Number(value).toFixed(decimals);
}

function App() {
  // ==========================================
  // WALLET
  // ==========================================

  const [account, setAccount] = useState("");

  // ==========================================
  // BALANCES
  // ==========================================

  const [balances, setBalances] = useState({
    ETH: "0",
    mUSDT: "0",
    mWBTC: "0",
    mSOL: "0",
  });

  // ==========================================
  // SWAP STATE
  // ==========================================

  const [fromToken, setFromToken] = useState("ETH");
  const [toToken, setToToken] = useState("mUSDT");

  const [amount, setAmount] = useState("");
  const [receiveAmount, setReceiveAmount] = useState("0");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // ==========================================
  // GET SELECTED POOL
  // ==========================================

  function getSelectedTokenConfig() {
    if (fromToken === "ETH" && toToken !== "ETH") {
      return TOKENS[toToken];
    }

    if (toToken === "ETH" && fromToken !== "ETH") {
      return TOKENS[fromToken];
    }

    return null;
  }

  // ==========================================
  // SEPOLIA NETWORK
  // ==========================================

  async function switchToSepolia() {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }],
      });

      return true;
    } catch (error) {
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0xaa36a7",
                chainName: "Sepolia",
                nativeCurrency: {
                  name: "Sepolia Ether",
                  symbol: "ETH",
                  decimals: 18,
                },
                rpcUrls: ["https://rpc.sepolia.org"],
                blockExplorerUrls: [
                  "https://sepolia.etherscan.io",
                ],
              },
            ],
          });

          return true;
        } catch (addError) {
          console.error(addError);
          return false;
        }
      }

      console.error(error);
      return false;
    }
  }

  // ==========================================
  // CONNECT WALLET
  // ==========================================

  async function connectWallet() {
    if (!window.ethereum) {
      alert("Please install MetaMask");
      return;
    }

    try {
      const switched = await switchToSepolia();

      if (!switched) {
        setMessage("Please switch MetaMask to Sepolia");
        return;
      }

      const provider = new ethers.BrowserProvider(
        window.ethereum
      );

      const network = await provider.getNetwork();

      if (network.chainId !== 11155111n) {
        setMessage("Wrong network. Please select Sepolia.");
        return;
      }

      const accounts = await provider.send(
        "eth_requestAccounts",
        []
      );

      const userAddress = accounts[0];

      setAccount(userAddress);

      await loadBalances(provider, userAddress);
    } catch (error) {
      console.error(error);

      setMessage(
        error?.shortMessage ||
        error?.message ||
        "Wallet connection failed"
      );
    }
  }

  // ==========================================
  // LOAD BALANCES
  // ==========================================

  async function loadBalances(provider, userAddress) {
    const newBalances = {
      ETH: "0",
      mUSDT: "0",
      mWBTC: "0",
      mSOL: "0",
    };

    try {
      const ethBalance = await provider.getBalance(userAddress);

      newBalances.ETH = formatAmount(
        ethers.formatEther(ethBalance),
        4
      );
    } catch (error) {
      console.error("ETH BALANCE ERROR:", error);
    }

    for (const symbol of ["mUSDT", "mWBTC", "mSOL"]) {
      try {
        const config = TOKENS[symbol];

        const code = await provider.getCode(config.address);

        if (code === "0x") {
          console.error(`${symbol} contract not found`);
          continue;
        }

        const token = new ethers.Contract(
          config.address,
          TOKEN_ABI,
          provider
        );

        const balance = await token.balanceOf(userAddress);

        newBalances[symbol] = formatAmount(
          ethers.formatUnits(balance, config.decimals),
          2
        );
      } catch (error) {
        console.error(`${symbol} BALANCE ERROR:`, error);
      }
    }

    setBalances(newBalances);
  }

  // ==========================================
  // TOKEN SELECTION
  // ==========================================

  function handleFromTokenChange(e) {
    const selected = e.target.value;

    setFromToken(selected);

    if (selected === "ETH") {
      if (toToken === "ETH") {
        setToToken("mUSDT");
      }
    } else {
      setToToken("ETH");
    }

    setAmount("");
    setReceiveAmount("0");
    setMessage("");
  }

  function handleToTokenChange(e) {
    const selected = e.target.value;

    setToToken(selected);

    if (selected === "ETH") {
      if (fromToken === "ETH") {
        setFromToken("mUSDT");
      }
    } else {
      setFromToken("ETH");
    }

    setAmount("");
    setReceiveAmount("0");
    setMessage("");
  }

  // ==========================================
  // TOKEN SWITCH
  // ==========================================

  function switchTokens() {
    const previousFrom = fromToken;
    const previousTo = toToken;

    setFromToken(previousTo);
    setToToken(previousFrom);

    setAmount("");
    setReceiveAmount("0");
    setMessage("");
  }

  // ==========================================
  // CALCULATE LIVE QUOTE
  // ==========================================

  async function calculateOutput(value) {
    if (!value || Number(value) <= 0) {
      setReceiveAmount("0");
      return;
    }

    try {
      if (!window.ethereum) return;

      const tokenConfig = getSelectedTokenConfig();

      if (!tokenConfig?.pool) {
        setReceiveAmount("0");
        return;
      }

      const provider = new ethers.BrowserProvider(
        window.ethereum
      );

      const swapContract = new ethers.Contract(
        tokenConfig.pool,
        MY_SWAP_ABI,
        provider
      );

      const storedToken = await swapContract.usdt();

      if (
        storedToken.toLowerCase() !==
        tokenConfig.address.toLowerCase()
      ) {
        console.error("POOL TOKEN MISMATCH");
        setReceiveAmount("0");
        return;
      }

      const [ethReserve, tokenReserve] =
        await swapContract.getReserves();

      let input;
      let reserveIn;
      let reserveOut;
      let outputDecimals;

      if (fromToken === "ETH") {
        input = ethers.parseEther(value);
        reserveIn = ethReserve;
        reserveOut = tokenReserve;
        outputDecimals = tokenConfig.decimals;
      } else {
        input = ethers.parseUnits(
          value,
          tokenConfig.decimals
        );

        reserveIn = tokenReserve;
        reserveOut = ethReserve;
        outputDecimals = 18;
      }

      const inputWithFee = input * (DENOMINATOR - FEE);

      const numerator = inputWithFee * reserveOut;

      const denominator =
        reserveIn * DENOMINATOR + inputWithFee;

      const output = numerator / denominator;

      const formatted = ethers.formatUnits(
        output,
        outputDecimals
      );

      setReceiveAmount(
        formatAmount(formatted, 6)
      );
    } catch (error) {
      console.error("QUOTE ERROR:", error);
      setReceiveAmount("0");
    }
  }

  // ==========================================
  // AMOUNT CHANGE
  // ==========================================

  async function handleAmountChange(e) {
    const value = e.target.value;

    setAmount(value);

    await calculateOutput(value);
  }

  // ==========================================
  // SWAP
  // ==========================================

  async function swap() {
    if (!amount || Number(amount) <= 0) {
      setMessage("Enter an amount");
      return;
    }

    if (!window.ethereum) {
      setMessage("Please install MetaMask");
      return;
    }

    const tokenConfig = getSelectedTokenConfig();

    if (!tokenConfig?.pool) {
      setMessage("Unsupported token pair");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const provider = new ethers.BrowserProvider(
        window.ethereum
      );

      const network = await provider.getNetwork();

      if (network.chainId !== 11155111n) {
        setMessage("Please switch MetaMask to Sepolia");
        return;
      }

      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      const swapContract = new ethers.Contract(
        tokenConfig.pool,
        MY_SWAP_ABI,
        signer
      );

      // ========================================
      // ETH -> ERC20
      // ========================================

      if (fromToken === "ETH") {
        const ethAmount = ethers.parseEther(amount);

        const ethBalance = await provider.getBalance(
          userAddress
        );

        if (ethBalance < ethAmount) {
          setMessage("Insufficient Sepolia ETH balance");
          return;
        }

        setMessage(
          `Confirm ETH → ${toToken} swap in MetaMask...`
        );

        const tx = await swapContract.swapETHForUSDT({
          value: ethAmount,
        });

        setMessage("Transaction submitted. Waiting...");

        await tx.wait();

        setMessage(
          `ETH → ${toToken} swap successful! 🎉`
        );
      }

      // ========================================
      // ERC20 -> ETH
      // ========================================

      else {
        const token = new ethers.Contract(
          tokenConfig.address,
          TOKEN_ABI,
          signer
        );

        const tokenAmount = ethers.parseUnits(
          amount,
          tokenConfig.decimals
        );

        const balance = await token.balanceOf(userAddress);

        if (balance < tokenAmount) {
          setMessage(
            `Insufficient ${fromToken} balance`
          );
          return;
        }

        let allowance = await token.allowance(
          userAddress,
          tokenConfig.pool
        );

        if (allowance < tokenAmount) {
          setMessage(
            `Approve ${fromToken} in MetaMask...`
          );

          const approveTx = await token.approve(
            tokenConfig.pool,
            tokenAmount
          );

          await approveTx.wait();

          allowance = await token.allowance(
            userAddress,
            tokenConfig.pool
          );
        }

        if (allowance < tokenAmount) {
          setMessage("Approval amount is insufficient");
          return;
        }

        const storedToken = await swapContract.usdt();

        if (
          storedToken.toLowerCase() !==
          tokenConfig.address.toLowerCase()
        ) {
          setMessage("Pool token mismatch");
          return;
        }

        setMessage(
          `Confirm ${fromToken} → ETH swap in MetaMask...`
        );

        const tx = await swapContract.swapUSDTForETH(
          tokenAmount
        );

        setMessage("Transaction submitted. Waiting...");

        await tx.wait();

        setMessage(
          `${fromToken} → ETH swap successful! 🎉`
        );
      }

      await loadBalances(provider, userAddress);

      setAmount("");
      setReceiveAmount("0");

    } catch (error) {
      console.error("SWAP ERROR:", error);

      setMessage(
        error?.reason ||
        error?.shortMessage ||
        error?.message ||
        "Transaction failed"
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="app">
      <div className="swap-card">

        {/* HEADER */}

        <div className="header">
          <div> 
            <h1>SynthosphereSwap</h1>
            {/* <p>Sepolia Testnet</p> */}
          </div>
          <div>
            <img src={logo} alt="logo" className="logo" />
          </div>
          <button
            className="connect-btn"
            onClick={connectWallet}
          >
            {account
              ? `${account.slice(0, 6)}...${account.slice(-4)}`
              : "Connect Wallet"}
          </button>
        </div>

        {/* BALANCES */}

        {account && (
          <div className="balances">
            {TOKEN_OPTIONS.map((symbol) => (
              <div key={symbol}>
                <span>{symbol}</span>
                <strong>{balances[symbol]}</strong>
              </div>
            ))}
          </div>
        )}

        {/* YOU PAY */}

        <div className="input-box">
          <div className="input-header">
            <span>You Pay</span>
            <span>
              Balance: {balances[fromToken]}
            </span>
          </div>

          <div className="input-row">
            <input
              type="number"
              step="any"
              min="0"
              placeholder="0.0"
              value={amount}
              onChange={handleAmountChange}
            />

            <select
              className="token"
              value={fromToken}
              onChange={handleFromTokenChange}
            >
              {TOKEN_OPTIONS.map((symbol) => (
                <option key={symbol} value={symbol}>
                  {symbol}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SWITCH */}

        <button
          className="switch-btn"
          onClick={switchTokens}
          type="button"
        >
          ⇅
        </button>

        {/* YOU RECEIVE */}

        <div className="input-box">
          <div className="input-header">
            <span>You Receive</span>
            <span>
              Balance: {balances[toToken]}
            </span>
          </div>

          <div className="input-row">
            <input
              value={receiveAmount}
              readOnly
            />

            <select
              className="token"
              value={toToken}
              onChange={handleToTokenChange}
            >
              {TOKEN_OPTIONS
                .filter((symbol) => symbol !== fromToken)
                .map((symbol) => (
                  <option key={symbol} value={symbol}>
                    {symbol}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* SWAP BUTTON */}

        <button
          className="swap-btn"
          onClick={swap}
          disabled={loading}
        >
          {loading ? "Processing..." : "SWAP"}
        </button>

        {/* MESSAGE */}

        {message && (
          <div className="message">
            {message}
          </div>
        )}

        {/* FOOTER */}

        <div className="footer">
          <span>Network</span>
          <strong>Sepolia</strong>
        </div>

      </div>
    </div>
  );
}

export default App;