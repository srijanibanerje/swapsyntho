import { useState } from "react";
import { ethers } from "ethers";
import "./App.css";

const MY_SWAP_ADDRESS = "0x99196CB17B27d9Ff34e2f1Afc9eE42aff53E0c54";

const USDT_ADDRESS =
  // "0x078cD44E0aafd4e188B5b4AF29B4DB49fa6ee675";
  "0xb161A0AdA15055110F11303F41ec185953eA1cb2";
// const MY_SWAP_ABI = [
//   "function swapETHForUSDT() external payable",
//   "function swapUSDTForETH(uint256 usdtAmount) external",
//   "function getReserves() external view returns (uint256, uint256)",
// ];
const MY_SWAP_ABI = [
  "function swapETHForUSDT() external payable",
  "function swapUSDTForETH(uint256 usdtAmount) external",
  "function getReserves() external view returns (uint256, uint256)",
  "function usdt() external view returns (address)",
];
const USDT_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
];

function App() {
  const [account, setAccount] = useState("");
  const [ethBalance, setEthBalance] = useState("0");
  const [usdtBalance, setUsdtBalance] = useState("0");

  const [fromToken, setFromToken] = useState("ETH");
  const [amount, setAmount] = useState("");

  const [receiveAmount, setReceiveAmount] = useState("0");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
async function switchToSepolia() {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0xaa36a7" }],
    });

    return true;
  } catch (error) {
    // Sepolia network MetaMask-এ না থাকলে add করবে
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
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            },
          ],
        });

        return true;
      } catch (addError) {
        console.error("Failed to add Sepolia:", addError);
        return false;
      }
    }

    console.error("Failed to switch to Sepolia:", error);
    return false;
  }
}
//   async function connectWallet() {
//     if (!window.ethereum) {
//       alert("Please install MetaMask");
//       return;
//     }

//     try {
//       const provider = new ethers.BrowserProvider(window.ethereum);
//       const network = await provider.getNetwork();

// console.log("CHAIN ID:", network.chainId.toString());
// console.log("NETWORK:", network.name);

// console.log("mUSDT ADDRESS:", USDT_ADDRESS);

// const code = await provider.getCode(USDT_ADDRESS);

// console.log("mUSDT CONTRACT CODE:", code);
//       const accounts = await provider.send("eth_requestAccounts", []);

//       const userAddress = accounts[0];

//       setAccount(userAddress);

//       await loadBalances(provider, userAddress);
//     } catch (error) {
//       console.error(error);
//     }
//   }

  // async function loadBalances(provider, userAddress) {
  //   const balance = await provider.getBalance(userAddress);
  //    console.log("RAW ETH BALANCE:", balance.toString());
  //   console.log(
  //     "ETH BALANCE:",
  //     ethers.formatEther(balance)
  //   );
  //   setEthBalance(
  //     Number(ethers.formatEther(balance)).toFixed(4)
  //   );

  //   const usdt = new ethers.Contract(
  //     USDT_ADDRESS,
  //     USDT_ABI,
  //     provider
  //   );

  //   const tokenBalance =
  //     await usdt.balanceOf(userAddress);

  //   setUsdtBalance(
  //     Number(
  //       ethers.formatUnits(tokenBalance, 18)
  //     ).toFixed(2)
  //   );
  // }



  async function connectWallet() {
  if (!window.ethereum) {
    alert("Please install MetaMask");
    return;
  }

  try {
    // First switch MetaMask to Sepolia
    const switched = await switchToSepolia();

    if (!switched) {
      setMessage("Please switch MetaMask to Sepolia");
      return;
    }

    // Create provider AFTER switching network
    const provider = new ethers.BrowserProvider(window.ethereum);

    const network = await provider.getNetwork();

    console.log("CHAIN ID:", network.chainId.toString());
    console.log("NETWORK:", network.name);

    // Safety check
    if (network.chainId !== 11155111n) {
      setMessage("Wrong network. Please select Sepolia.");
      return;
    }

    console.log("mUSDT ADDRESS:", USDT_ADDRESS);

    const code = await provider.getCode(USDT_ADDRESS);

    // console.log("mUSDT CONTRACT CODE:", code);

    if (code === "0x") {
      setMessage("mUSDT contract not found on Sepolia");
      return;
    }

    // Request wallet account
    const accounts = await provider.send(
      "eth_requestAccounts",
      []
    );

    const userAddress = accounts[0];

    console.log("CONNECTED WALLET:", userAddress);

    setAccount(userAddress);

    await loadBalances(provider, userAddress);

  } catch (error) {
    console.error("Wallet connection error:", error);

    setMessage(
      error?.shortMessage ||
      error?.message ||
      "Wallet connection failed"
    );
  }
}
  async function loadBalances(provider, userAddress) {
    // ETH
    try {
      const balance = await provider.getBalance(userAddress);

      const eth = Number(ethers.formatEther(balance)).toFixed(4);

      console.log("ETH BALANCE:", eth);

      setEthBalance(eth);
    } catch (error) {
      console.error("ETH BALANCE ERROR:", error);
    }

    // mUSDT
    try {
      const code = await provider.getCode(USDT_ADDRESS);

      if (code === "0x") {
        console.error("No contract found at this address on current network");

        setUsdtBalance("0");
        return;
      }

      const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

      const tokenBalance = await usdt.balanceOf(userAddress);

      const formatted = Number(ethers.formatUnits(tokenBalance, 18)).toFixed(2);

      console.log("mUSDT BALANCE:", formatted);

      setUsdtBalance(formatted);
    } catch (error) {
      console.error("mUSDT BALANCE ERROR:", error);
    }
  }

  async function calculateOutput(value) {
    if (!value || Number(value) <= 0) {
      setReceiveAmount("0");
      return;
    }

    try {
      if (!window.ethereum) return;

      const provider = new ethers.BrowserProvider(window.ethereum);
     

      const code = await provider.getCode(USDT_ADDRESS);

      const swap = new ethers.Contract(MY_SWAP_ADDRESS, MY_SWAP_ABI, provider);

      const [ethReserve, usdtReserve] = await swap.getReserves();

      const FEE = 30n;
      const DENOMINATOR = 10000n;

      if (fromToken === "ETH") {
        const input = ethers.parseEther(value);

        const inputWithFee = input * (DENOMINATOR - FEE);

        const numerator = inputWithFee * usdtReserve;

        const denominator = ethReserve * DENOMINATOR + inputWithFee;

        const output = numerator / denominator;

        setReceiveAmount(Number(ethers.formatUnits(output, 18)).toFixed(4));
      } else {
        const input = ethers.parseUnits(value, 18);

        const inputWithFee = input * (DENOMINATOR - FEE);

        const numerator = inputWithFee * ethReserve;

        const denominator = usdtReserve * DENOMINATOR + inputWithFee;

        const output = numerator / denominator;

        setReceiveAmount(Number(ethers.formatEther(output)).toFixed(6));
      }
    } catch (error) {
      console.error(error);
      setReceiveAmount("0");
    }
  }

  async function handleAmountChange(e) {
    const value = e.target.value;

    setAmount(value);

    await calculateOutput(value);
  }

  // async function swap() {
  //   if (!amount || Number(amount) <= 0) {
  //     setMessage("Enter an amount");
  //     return;
  //   }

  //   if (!window.ethereum) {
  //     setMessage("Please install MetaMask");
  //     return;
  //   }

  //   try {
  //     setLoading(true);
  //     setMessage("");

  //     const provider = new ethers.BrowserProvider(window.ethereum);

  //     const signer = await provider.getSigner();

  //     const swapContract = new ethers.Contract(
  //       MY_SWAP_ADDRESS,
  //       MY_SWAP_ABI,
  //       signer,
  //     );

  //     if (fromToken === "ETH") {
  //       const ethAmount = ethers.parseEther(amount);

  //       setMessage("Confirm the transaction in MetaMask...");

  //       const tx = await swapContract.swapETHForUSDT({
  //         value: ethAmount,
  //       });

  //       setMessage("Transaction submitted. Waiting...");

  //       await tx.wait();

  //       setMessage("Swap successful! 🎉");
  //     } else {
  //       const usdt = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

  //       const usdtAmount = ethers.parseUnits(amount, 18);

  //       setMessage("Approve mUSDT in MetaMask...");

  //       const approveTx = await usdt.approve(MY_SWAP_ADDRESS, usdtAmount);

  //       await approveTx.wait();

  //       setMessage("Approval successful. Confirm swap...");

  //       const tx = await swapContract.swapUSDTForETH(usdtAmount);

  //       setMessage("Swap transaction submitted...");

  //       await tx.wait();

  //       setMessage("Swap successful! 🎉");
  //     }

  //     const updatedProvider = new ethers.BrowserProvider(window.ethereum);

  //     await loadBalances(updatedProvider, account);

  //     setAmount("");
  //     setReceiveAmount("0");
  //   } catch (error) {
  //     console.error(error);

  //     setMessage(error?.reason || error?.shortMessage || "Transaction failed");
  //   } finally {
  //     setLoading(false);
  //   }
  // }
  async function swap() {
  if (!amount || Number(amount) <= 0) {
    setMessage("Enter an amount");
    return;
  }

  if (!window.ethereum) {
    setMessage("Please install MetaMask");
    return;
  }

  try {
    setLoading(true);
    setMessage("");

    const provider = new ethers.BrowserProvider(window.ethereum);

    // =========================
    // CHECK NETWORK
    // =========================
    const network = await provider.getNetwork();

    console.log(
      "SWAP CHAIN ID:",
      network.chainId.toString()
    );

    if (network.chainId !== 11155111n) {
      setMessage("Please switch MetaMask to Sepolia");
      return;
    }

    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();

    console.log("USER ADDRESS:", userAddress);

    const swapContract = new ethers.Contract(
      MY_SWAP_ADDRESS,
      MY_SWAP_ABI,
      signer
    );

    // =========================
    // ETH -> mUSDT
    // =========================
    if (fromToken === "ETH") {
      const ethAmount = ethers.parseEther(amount);

      console.log("ETH INPUT:", amount);
      console.log("ETH RAW:", ethAmount.toString());

      setMessage(
        "Confirm the transaction in MetaMask..."
      );

      const tx = await swapContract.swapETHForUSDT({
        value: ethAmount,
      });

      console.log("ETH -> mUSDT TX:", tx.hash);

      setMessage(
        "Transaction submitted. Waiting..."
      );

      await tx.wait();

      setMessage("Swap successful! 🎉");
    }

    // =========================
    // mUSDT -> ETH
    // =========================
    else {
      const usdt = new ethers.Contract(
        USDT_ADDRESS,
        USDT_ABI,
        signer
      );

      // Check contract
      const code = await provider.getCode(
        USDT_ADDRESS
      );

      console.log(
        "mUSDT CONTRACT CODE:",
        code
      );

      if (code === "0x") {
        setMessage(
          "mUSDT contract not found on Sepolia"
        );
        return;
      }

      // -------------------------
      // Decimals
      // -------------------------
      const decimals = 18;

      console.log(
        "mUSDT DECIMALS:",
        decimals
      );

      const usdtAmount = ethers.parseUnits(
        amount,
        decimals
      );

      console.log(
        "mUSDT INPUT:",
        amount
      );

      console.log(
        "mUSDT RAW INPUT:",
        usdtAmount.toString()
      );

      // -------------------------
      // Balance
      // -------------------------
      const balance = await usdt.balanceOf(
        userAddress
      );

      console.log(
        "mUSDT BALANCE:",
        ethers.formatUnits(
          balance,
          decimals
        )
      );

      if (balance < usdtAmount) {
        setMessage(
          "Insufficient mUSDT balance"
        );
        return;
      }

      // -------------------------
      // Allowance
      // -------------------------
      let allowance =
        await usdt.allowance(
          userAddress,
          MY_SWAP_ADDRESS
        );

      console.log(
        "CURRENT ALLOWANCE:",
        ethers.formatUnits(
          allowance,
          decimals
        )
      );

      // -------------------------
      // Approve
      // -------------------------
      if (allowance < usdtAmount) {
        setMessage(
          "Approve mUSDT in MetaMask..."
        );

        const approveTx =
          await usdt.approve(
            MY_SWAP_ADDRESS,
            usdtAmount
          );

        console.log(
          "APPROVE TX:",
          approveTx.hash
        );

        await approveTx.wait();

        console.log(
          "APPROVAL CONFIRMED"
        );

        // Check again
        allowance =
          await usdt.allowance(
            userAddress,
            MY_SWAP_ADDRESS
          );

        console.log(
          "NEW ALLOWANCE:",
          ethers.formatUnits(
            allowance,
            decimals
          )
        );
      }

      if (allowance < usdtAmount) {
        setMessage(
          "Approval amount is insufficient"
        );
        return;
      }

      // -------------------------
      // Check ETH reserve
      // -------------------------
      const reserves =
        await swapContract.getReserves();
      const contractUSDT =
  await swapContract.usdt();

console.log(
  "USDT STORED INSIDE SWAP:",
  contractUSDT
);

console.log(
  "USDT USED BY FRONTEND:",
  USDT_ADDRESS
);
      const ethReserve = reserves[0];
      const usdtReserve = reserves[1];

      console.log(
        "ETH RESERVE:",
        ethers.formatEther(
          ethReserve
        )
      );

      console.log(
        "mUSDT RESERVE:",
        ethers.formatUnits(
          usdtReserve,
          decimals
        )
      );

      // -------------------------
      // Estimate gas
      // -------------------------
      setMessage(
        "Checking swap..."
      );

      console.log(
        "Estimating mUSDT -> ETH gas..."
      );

      const gas =
        await swapContract.swapUSDTForETH.estimateGas(
          usdtAmount
        );

      console.log(
        "ESTIMATED GAS:",
        gas.toString()
      );

      // -------------------------
      // Send swap
      // -------------------------
      setMessage(
        "Confirm mUSDT → ETH swap in MetaMask..."
      );

      const tx =
        await swapContract.swapUSDTForETH(
          usdtAmount
        );

      console.log(
        "mUSDT -> ETH TX:",
        tx.hash
      );

      setMessage(
        "Swap transaction submitted. Waiting..."
      );

      await tx.wait();

      setMessage(
        "Swap successful! 🎉"
      );
    }

    // =========================
    // REFRESH BALANCES
    // =========================
    const updatedProvider =
      new ethers.BrowserProvider(
        window.ethereum
      );

    await loadBalances(
      updatedProvider,
      userAddress
    );

    setAmount("");
    setReceiveAmount("0");

  } catch (error) {
    console.error(
      "SWAP ERROR:",
      error
    );

    console.log(
      "ERROR DATA:",
      error?.data
    );

    console.log(
      "ERROR REASON:",
      error?.reason
    );

    console.log(
      "ERROR SHORT MESSAGE:",
      error?.shortMessage
    );

    setMessage(
      error?.reason ||
      error?.shortMessage ||
      "Transaction failed"
    );

  } finally {
    setLoading(false);
  }
}

  function switchTokens() {
    setFromToken(fromToken === "ETH" ? "mUSDT" : "ETH");

    setAmount("");
    setReceiveAmount("0");
  }

  return (
    <div className="app">
      <div className="swap-card">
        <div className="header">
          <div>
            <h1>MySwap</h1>
            <p>Sepolia Testnet</p>
          </div>

          <button className="connect-btn" onClick={connectWallet}>
            {account
              ? `${account.slice(0, 6)}...${account.slice(-4)}`
              : "Connect Wallet"}
          </button>
        </div>

        {account && (
          <div className="balances">
            <div>
              <span>ETH</span>
              <strong>{ethBalance}</strong>
            </div>

            <div>
              <span>mUSDT</span>
              <strong>{usdtBalance}</strong>
            </div>
          </div>
        )}

        <div className="input-box">
          <div className="input-header">
            <span>You Pay</span>
          </div>

          <div className="input-row">
            <input
              type="number"
              placeholder="0.0"
              value={amount}
              onChange={handleAmountChange}
            />

            <div className="token">{fromToken}</div>
          </div>
        </div>

        <button className="switch-btn" onClick={switchTokens}>
          ⇅
        </button>

        <div className="input-box">
          <div className="input-header">
            <span>You Receive</span>
          </div>

          <div className="input-row">
            <input value={receiveAmount} readOnly />

            <div className="token">{fromToken === "ETH" ? "mUSDT" : "ETH"}</div>
          </div>
        </div>

        <button className="swap-btn" onClick={swap} disabled={loading}>
          {loading ? "Processing..." : "SWAP"}
        </button>

        {message && <div className="message">{message}</div>}

        <div className="footer">
          <span>Network</span>
          <strong>Sepolia</strong>
        </div>
      </div>
    </div>
  );
}

export default App;
