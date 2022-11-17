import { expect } from "chai";
import { ethers } from "hardhat";

const ONE_MILLION = ethers.utils.parseEther("1000000");
const ONE_THOUSAND = ethers.utils.parseEther("1000");
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

describe("InvestmentTokenM Contract", async () => {
  let token: any;
  let registry: any;
  let OWNER: any;
  let ADDR1: any;
  let ADDR2: any;

  beforeEach(async () => {
    const Registry = await ethers.getContractFactory("AllowlistRegistry");
    const Token = await ethers.getContractFactory("InvestmentTokenM");
    [OWNER, ADDR1, ADDR2] = await ethers.getSigners();

    registry = await Registry.deploy();
    token = await Token.deploy("Investment Token", "ITK", registry.address);

    await token.mint(ONE_MILLION);
  });

  describe("Initialize", () => {
    it("Should assign the total supply of tokens to the owner", async () => {
      expect(await token.balanceOf(OWNER.address)).to.equal(ONE_MILLION);
    });
  });

  describe("mint", () => {
    it("Should mint tokens to the owner", async () => {
      await token.mint(ONE_THOUSAND);

      expect(await token.balanceOf(OWNER.address)).to.equal(
        ONE_MILLION.add(ONE_THOUSAND)
      );
    });

    it("Should mint failed when caller is not the owner", async () => {
      await expect(
        token
          .connect(ADDR1)
          .adminTransfer(ADDR2.address, ADDR1.address, ONE_THOUSAND)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should mint failed when mintable has renounced", async () => {
      await token.renounceMintable();

      await expect(token.mint(ONE_THOUSAND)).to.be.revertedWith(
        "ERC20Mintable: mintable has renounced"
      );
    });
  });

  describe("renounceMintable", () => {
    it("Should renounceMintable", async () => {
      await token.renounceMintable();

      expect(await token.mintable()).to.be.false;
    });

    it("Should renounceMintable failed when caller is not the owner", async () => {
      await expect(token.connect(ADDR1).renounceMintable()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("Should renounceMintable failed when mintable has renounced", async () => {
      await token.renounceMintable();

      await expect(token.renounceMintable()).to.be.revertedWith(
        "ERC20Mintable: mintable has renounced"
      );
    });
  });

  describe("adminTransfer", () => {
    it("Should adminTransfer when sender is the owner", async () => {
      await token.adminTransfer(OWNER.address, ADDR1.address, ONE_THOUSAND);

      expect(await token.balanceOf(ADDR1.address)).to.equal(ONE_THOUSAND);

      await token.adminTransfer(ADDR1.address, OWNER.address, ONE_THOUSAND);

      expect(await token.balanceOf(OWNER.address)).to.equal(ONE_MILLION);
    });

    it("Should adminTransfer failed when amount exceeds balance", async () => {
      await expect(
        token.adminTransfer(ADDR2.address, ADDR1.address, ONE_THOUSAND)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("Should adminTransfer failed when sender is not the owner", async () => {
      await expect(
        token
          .connect(ADDR1)
          .adminTransfer(ADDR2.address, ADDR1.address, ONE_THOUSAND)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("adminBurn", () => {
    it("Should adminBurn when sender is the owner", async () => {
      await token.adminTransfer(OWNER.address, ADDR1.address, ONE_THOUSAND);

      expect(await token.balanceOf(ADDR1.address)).to.equal(ONE_THOUSAND);

      await token.adminBurn(ADDR1.address, ONE_THOUSAND);

      expect(await token.balanceOf(ADDR1.address)).to.equal(0);
    });

    it("Should adminBurn failed when amount exceeds balance", async () => {
      await expect(
        token.adminBurn(ADDR1.address, ONE_THOUSAND)
      ).to.be.revertedWith("ERC20: burn amount exceeds balance");
    });

    it("Should adminBurn failed when sender is not the owner", async () => {
      await expect(
        token.connect(ADDR1).adminBurn(ADDR2.address, ONE_THOUSAND)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Transfer", () => {
    it("Should transfer when sender is the owner and receiver are not allowlisted account", async () => {
      await token.transfer(ADDR1.address, ONE_THOUSAND);

      expect(await token.balanceOf(OWNER.address)).to.equal(
        ONE_MILLION.sub(ONE_THOUSAND)
      );
      expect(await token.balanceOf(ADDR1.address)).to.equal(ONE_THOUSAND);
    });

    it("Should transfer when sender and receiver are allowlisted account", async () => {
      await token.transfer(ADDR1.address, ONE_THOUSAND);
      await registry.addAllowlist(ADDR1.address);
      await registry.addAllowlist(ADDR2.address);

      await token.connect(ADDR1).transfer(ADDR2.address, ONE_THOUSAND);

      expect(await token.balanceOf(OWNER.address)).to.equal(
        ONE_MILLION.sub(ONE_THOUSAND)
      );
      expect(await token.balanceOf(ADDR1.address)).to.equal(0);
      expect(await token.balanceOf(ADDR2.address)).to.equal(ONE_THOUSAND);
    });

    it("Should transfer failed when sender are not allowlisted account", async () => {
      await token.transfer(ADDR1.address, ONE_THOUSAND);

      await expect(
        token.connect(ADDR1).transfer(OWNER.address, ONE_THOUSAND)
      ).to.be.revertedWith("InvestmentToken: account are not allowlisted");
    });

    it("Should transfer failed when receiver are not allowlisted account", async () => {
      await token.transfer(ADDR1.address, ONE_THOUSAND);
      await registry.addAllowlist(ADDR1.address);

      await expect(
        token.connect(ADDR1).transfer(ADDR2.address, ONE_THOUSAND)
      ).to.be.revertedWith("InvestmentToken: account are not allowlisted");
    });

    it("Should transferFrom when owner and spender are allowlisted account", async () => {
      await token.transfer(ADDR1.address, ONE_THOUSAND);
      await registry.addAllowlist(ADDR1.address);
      await registry.addAllowlist(ADDR2.address);
      await token.connect(ADDR1).approve(ADDR2.address, ONE_THOUSAND);

      await token
        .connect(ADDR2)
        .transferFrom(ADDR1.address, ADDR2.address, ONE_THOUSAND);

      expect(await token.balanceOf(ADDR1.address)).to.equal(0);
      expect(await token.balanceOf(ADDR2.address)).to.equal(ONE_THOUSAND);
    });

    it("Should transferFrom failed when owner are not allowlisted account", async () => {
      await token.transfer(ADDR1.address, ONE_THOUSAND);
      await registry.addAllowlist(ADDR1.address);
      await registry.addAllowlist(ADDR2.address);

      await token.connect(ADDR1).approve(ADDR2.address, ONE_THOUSAND);
      await registry.removeAllowlist(ADDR1.address);

      await expect(
        token
          .connect(ADDR2)
          .transferFrom(ADDR1.address, ADDR2.address, ONE_THOUSAND)
      ).to.be.revertedWith("InvestmentToken: account are not allowlisted");
    });

    it("Should transferFrom failed when spender are not allowlisted account", async () => {
      await token.transfer(ADDR1.address, ONE_THOUSAND);
      await registry.addAllowlist(ADDR1.address);
      await registry.addAllowlist(ADDR2.address);

      await token.connect(ADDR1).approve(ADDR2.address, ONE_THOUSAND);

      await registry.removeAllowlist(ADDR2.address);

      await expect(
        token
          .connect(ADDR2)
          .transferFrom(ADDR1.address, ADDR2.address, ONE_THOUSAND)
      ).to.be.revertedWith("InvestmentToken: account are not allowlisted");
    });
  });

  describe("Allowance", () => {
    it("Should approve when owner and spender are allowlisted account", async () => {
      await registry.addAllowlist(ADDR1.address);
      await registry.addAllowlist(ADDR2.address);

      await token.connect(ADDR1).approve(ADDR2.address, ONE_THOUSAND);

      expect(await token.allowance(ADDR1.address, ADDR2.address)).to.equal(
        ONE_THOUSAND
      );
    });

    it("Should approve failed when owner are not allowlisted account", async () => {
      await registry.addAllowlist(ADDR1.address);
      await registry.addAllowlist(ADDR2.address);

      await registry.removeAllowlist(ADDR1.address);
      await expect(
        token.connect(ADDR1).approve(ADDR2.address, ONE_THOUSAND)
      ).to.be.revertedWith("InvestmentToken: account are not allowlisted");
    });

    it("Should approve failed when spender are not allowlisted account", async () => {
      await registry.addAllowlist(ADDR1.address);
      await registry.addAllowlist(ADDR2.address);

      await registry.removeAllowlist(ADDR2.address);
      await expect(
        token.connect(ADDR1).approve(ADDR2.address, ONE_THOUSAND)
      ).to.be.revertedWith("InvestmentToken: account are not allowlisted");
    });

    it("Should increaseAllowance owner and spender are allowlisted account", async () => {
      await registry.addAllowlist(ADDR1.address);
      await registry.addAllowlist(ADDR2.address);

      await token.connect(ADDR1).approve(ADDR2.address, ONE_THOUSAND);
      await token.connect(ADDR1).increaseAllowance(ADDR2.address, ONE_THOUSAND);

      expect(await token.allowance(ADDR1.address, ADDR2.address)).to.equal(
        ONE_THOUSAND.add(ONE_THOUSAND)
      );
    });

    it("Should increaseAllowance failed when owner are not allowlisted account", async () => {
      await registry.addAllowlist(ADDR1.address);
      await registry.addAllowlist(ADDR2.address);

      await registry.removeAllowlist(ADDR1.address);
      await expect(
        token.connect(ADDR1).increaseAllowance(ADDR2.address, ONE_THOUSAND)
      ).to.be.revertedWith("InvestmentToken: account are not allowlisted");
    });

    it("Should increaseAllowance failed when spender are not allowlisted account", async () => {
      await registry.addAllowlist(ADDR1.address);
      await registry.addAllowlist(ADDR2.address);

      await registry.removeAllowlist(ADDR2.address);
      await expect(
        token.connect(ADDR1).increaseAllowance(ADDR2.address, ONE_THOUSAND)
      ).to.be.revertedWith("InvestmentToken: account are not allowlisted");
    });

    it("Should decreaseAllowance owner and spender are allowlisted account", async () => {
      await registry.addAllowlist(ADDR1.address);
      await registry.addAllowlist(ADDR2.address);

      await token
        .connect(ADDR1)
        .approve(ADDR2.address, ONE_THOUSAND.add(ONE_THOUSAND));
      await token.connect(ADDR1).decreaseAllowance(ADDR2.address, ONE_THOUSAND);

      expect(await token.allowance(ADDR1.address, ADDR2.address)).to.equal(
        ONE_THOUSAND
      );
    });

    it("Should decreaseAllowance failed when owner are not allowlisted account", async () => {
      await registry.addAllowlist(ADDR1.address);
      await registry.addAllowlist(ADDR2.address);

      await registry.removeAllowlist(ADDR1.address);
      await expect(
        token.connect(ADDR1).decreaseAllowance(ADDR2.address, ONE_THOUSAND)
      ).to.be.revertedWith("InvestmentToken: account are not allowlisted");
    });

    it("Should decreaseAllowance failed when spender are not allowlisted account", async () => {
      await registry.addAllowlist(ADDR1.address);
      await registry.addAllowlist(ADDR2.address);

      await registry.removeAllowlist(ADDR2.address);
      await expect(
        token.connect(ADDR1).decreaseAllowance(ADDR2.address, ONE_THOUSAND)
      ).to.be.revertedWith("InvestmentToken: account are not allowlisted");
    });
  });

  describe("Burnable", () => {
    it("Should burn tokens on the owner", async () => {
      await token.burn(0);

      expect(await token.balanceOf(OWNER.address)).to.equal(ONE_MILLION);

      await token.burn(ONE_MILLION);

      expect(await token.balanceOf(OWNER.address)).to.equal(0);
    });

    it("Should burn tokens on allowlisted account", async () => {
      await token.transfer(ADDR1.address, ONE_THOUSAND);
      await registry.addAllowlist(ADDR1.address);

      await token.connect(ADDR1).burn(ONE_THOUSAND);

      expect(await token.balanceOf(ADDR1.address)).to.equal(0);
    });

    it("Should burn tokens failed when account are not allowlisted", async () => {
      await token.transfer(ADDR1.address, ONE_THOUSAND);

      await expect(token.connect(ADDR1).burn(ONE_THOUSAND)).to.be.revertedWith(
        "InvestmentToken: account are not allowlisted"
      );
    });

    it("Should burn tokens failed when amount exceeds balance", async () => {
      await registry.addAllowlist(ADDR1.address);
      await expect(token.connect(ADDR1).burn(ONE_MILLION)).to.be.revertedWith(
        "ERC20: burn amount exceeds balance"
      );
    });

    it("Should burnFrom tokens from given allowance", async () => {
      await token.transfer(ADDR1.address, ONE_THOUSAND);
      await registry.addAllowlist(ADDR1.address);
      await registry.addAllowlist(ADDR2.address);

      await token.connect(ADDR1).approve(ADDR2.address, ONE_THOUSAND);

      await token.connect(ADDR2).burnFrom(ADDR1.address, ONE_THOUSAND);

      expect(await token.balanceOf(ADDR1.address)).to.equal(0);
    });

    it("Should burnFrom given allowance less than burn amounts failed", async () => {
      await token.transfer(ADDR1.address, ONE_THOUSAND);
      await registry.addAllowlist(ADDR1.address);
      await registry.addAllowlist(ADDR2.address);

      await token.connect(ADDR1).approve(ADDR2.address, ONE_THOUSAND);

      await expect(
        token.connect(ADDR2).burnFrom(ADDR1.address, ONE_MILLION)
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });

    it("Should burnFrom failed when spender are not allowlisted account", async () => {
      await token.transfer(ADDR1.address, ONE_THOUSAND);
      await registry.addAllowlist(ADDR1.address);
      await registry.addAllowlist(ADDR2.address);

      await token.connect(ADDR1).approve(ADDR2.address, ONE_THOUSAND);

      await registry.removeAllowlist(ADDR2.address);

      await expect(
        token.connect(ADDR2).burnFrom(ADDR1.address, ONE_MILLION)
      ).to.be.revertedWith("InvestmentToken: account are not allowlisted");
    });

    it("Should burnFrom failed when owner are not allowlisted account", async () => {
      await token.transfer(ADDR1.address, ONE_THOUSAND);
      await registry.addAllowlist(ADDR1.address);
      await registry.addAllowlist(ADDR2.address);

      await token.connect(ADDR1).approve(ADDR2.address, ONE_THOUSAND);

      await registry.removeAllowlist(ADDR1.address);

      await expect(
        token.connect(ADDR2).burnFrom(ADDR1.address, ONE_MILLION)
      ).to.be.revertedWith("InvestmentToken: account are not allowlisted");
    });
  });

  describe("SetAllowlistRegistry", async () => {
    it("Should setAllowlistRegistry", async () => {
      const Registry = await ethers.getContractFactory("AllowlistRegistry");
      const registry = await Registry.deploy();

      await token.setAllowlistRegistry(registry.address);
      expect(await token.allowlistRegistry()).to.equal(registry.address);
    });

    it("Should setAllowlistRegistry failed when sender is not the owner", async () => {
      const Registry = await ethers.getContractFactory("AllowlistRegistry");
      const registry = await Registry.deploy();

      await expect(
        token.connect(ADDR1).setAllowlistRegistry(registry.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Pausable", async () => {
    it("Should pause contract", async () => {
      await token.pause();

      expect(await token.paused()).to.be.true;
    });

    it("Should unpause contract", async () => {
      await token.pause();
      await token.unpause();

      expect(await token.paused()).to.be.false;
    });

    it("Should unpause contract failed when contract is not paused", async () => {
      await expect(token.unpause()).to.be.revertedWith("Pausable: not paused");
    });

    it("Should pause contract failed when contract is paused", async () => {
      await token.pause();

      await expect(token.pause()).to.be.revertedWith("Pausable: paused");
    });

    it("Should pause contract failed when sender is not the owner", async () => {
      await expect(token.connect(ADDR1).pause()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("Should unpause contract failed when sender is not the owner", async () => {
      await expect(token.connect(ADDR1).unpause()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("EmergencyWithdrawable", async () => {
    let randomToken: any;

    beforeEach(async () => {
      const RandomToken = await ethers.getContractFactory("InvestmentToken");
      randomToken = await RandomToken.deploy(
        "Random Token",
        "RAND",
        ONE_MILLION,
        registry.address
      );
      randomToken.transfer(token.address, ONE_MILLION);
    });

    it("Should withdraw ERC20 tokens", async () => {
      await registry.addAllowlist(OWNER.address);
      await registry.addAllowlist(token.address);

      await token.emergencyWithdrawToken(randomToken.address);

      expect(await randomToken.balanceOf(token.address)).to.equal(0);
      expect(await randomToken.balanceOf(OWNER.address)).to.equal(ONE_MILLION);
    });

    it("Should withdraw ERC20 tokens failed with non-ERC20 address", async () => {
      await expect(token.emergencyWithdrawToken(ZERO_ADDRESS)).to.be.reverted;
    });

    it("Should withdraw ERC20 tokens failed when sender is not the owner", async () => {
      await expect(
        token.connect(ADDR1).emergencyWithdrawToken(randomToken.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});
